import os

class MaxarFinder():
    
    def __init__(self):
         self.listOfDict:dict = {}
       
    
    # def kl():
    #     print('hello')
    
    def insertTif(self,tifId:str,tifSrc:str)->None:
        self.listOfDict[tifId]["srcTif"]=tifSrc


    def insertShp(self,tifId:str,srcShp:str)->None:
        self.listOfDict[tifId]["srcShp"]=srcShp

    def insertXml(self,tifId:str,srcXml:str)->None:
        self.listOfDict[tifId]["srcXml"]=srcXml
    

    def findTiff(self,pathToSearch:str):
        for  root, dirs, files in  os.walk(pathToSearch):
            for file in files:
                new_file = file.lower()
                # print(new_file)
                if(new_file.endswith('_pixel_shape.shp') or new_file.endswith('.tif') or new_file.endswith('.tiff') or new_file.endswith('.xml') and not new_file.endswith('readme.xml')):
                    tifId=''
                    suffix = new_file.split('.')[-1]
                    if(new_file.endswith('_pixel_shape.shp')):
                        tifId = new_file.removesuffix('_pixel_shape.shp')
                        print(tifId,'tifname')
                    else:
                        tifId = new_file[:new_file.find('.')]   
                        print(tifId,'tif_name with point .') 
                    if ( not tifId in self.listOfDict.keys()):
                        self.listOfDict[tifId]={
                            "angle":0,
                            "srcTif":"",
                            "srcShp":"",
                            "srcXml":"",
                            "coordinate":"",
                            "date":"",
                            "bounder":""
                        }
                    
                    match suffix:
                        case 'shp':
                            self.insertShp(tifId,os.path.join(root,file))
                        case 'xml':
                            self.insertXml(tifId,os.path.join(root,file))
                        case 'tif':
                            self.insertTif(tifId,os.path.join(root,file))

                # if (self.listOfDict.get())
                #     self.listOfDict[file]
                
    def showAll(self):
        for i in self.listOfDict:
            print('this uique',i,self.listOfDict[i],'\n')
                
data = MaxarFinder()
data.findTiff(r'D:\Maxar')
print(data.showAll())
# .findTiff(r'L:\MAXAR')
